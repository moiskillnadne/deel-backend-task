import express from 'express';
import bodyParser from 'body-parser';
import { Op, Sequelize } from 'sequelize'

import { sequelize } from './model.js'
import { getProfile } from './middleware/getProfile.js'

const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id } = req.params
    const { id: profileId } = req.profile

    const contract = await Contract.findOne({ 
        where: { 
            id, 
            [Op.or]: [ 
                { clientId: profileId },
                { contractorId: profileId } 
            ] 
        } 
      })

    if(!contract) return res.status(404).json({ message: 'Not found' }).end()
    res.json(contract)
})

/**
 * @returns All not terminated contracts by profile id 
 */
app.get('/contracts', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id: profileId } = req.profile

    const contracts = await Contract.findAll({ 
        where: {
            [Op.not]: { status: 'terminated' },
            [Op.or]: [ 
                { clientId: profileId },
                { contractorId: profileId } 
            ] 
        } 
      })

    res.json(contracts)
})

/**
 * @returns Get all unpaid jobs for a user (**_either_** a client or contractor), for **_active contracts only_**.
 */
app.get('/jobs/unpaid', getProfile, async (req, res) => {
    const { Contract, Job } = req.app.get('models')
    const { id: profileId } = req.profile

    const job = await Job.findAll({ 
        where: { 
            paid: null,
        },
        include: [{ 
            model: Contract,
            attributes: [],
            where: { 
                status: 'in_progress', 
                [Op.or]: [ { clientId: profileId }, { contractorId: profileId } ] 
            } 
        }]
    })


    res.json(job)
})

/**
 * @description Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.
 */
app.post('/jobs/:jobId/pay', getProfile, async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models')
    const { id: profileId } = req.profile
    const { jobId } = req.params

    const transaction = await sequelize.transaction({
        // isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE -- Not supported by sqlite
    })

    try {
        const job = await Job.findOne({
            // Find the job by id, that is unpaid and belongs to an active contract
            // and the client is the one making the payment
            where: { 
                id: jobId, 
                paid: null 
            },
            include: [{ 
                model: Contract,
                where: { 
                    status: 'in_progress', 
                    clientId: profileId
                }
            }]
        }, { transaction })

        if(!job) {
            throw new Error('Unpaid job by job id not found')
        }


        const client = await Profile.findByPk(job.Contract.ClientId, { transaction });
        const contractor = await Profile.findByPk(job.Contract.ContractorId, { transaction });

        const amount = job.price

        if (client.balance < amount) {
          throw new Error('Insufficient funds');
        }
    
        client.balance -= amount; // Decrease the balance of the client
        contractor.balance += amount; // Increase the balance of the contractor
    
        await client.save({ transaction });
        await contractor.save({ transaction });


        // Update the job to be paid and set the payment date
        job.paid = true;
        job.paymentDate = new Date();

        await job.save({ transaction });
    

        // Commit the transaction
        await transaction.commit();
        res.json({ message: 'Payment processed successfully' });
      } catch (error) {
        console.error(error);
        await transaction.rollback();
        res.status(404).json({ message: 'Transaction failed' });
      }
})


/**
 * @description Deposits money into the balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
 */
app.post('/balances/deposit/:userId', async (req, res) => {
    const { Profile, Contract, Job } = req.app.get('models')
    const { userId } = req.params
    const { amount } = req.body


    const transaction = await sequelize.transaction({
        // isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE -- Not supported by sqlite
    })

    try {
        const profile = await Profile.findOne({
            where: { id: userId, type: 'client' },
            attributes: [
                'id',
                'balance',
                [(Sequelize.fn('SUM', Sequelize.col('Client.Jobs.price'))), 'totalAmountDue']
            ],
            include: [{ 
                model: Contract, 
                as: 'Client',
                where: { status: 'in_progress' },
                attributes: [],
                include: [{ 
                    model: Job, 
                    where: { paid: null },
                    attributes: []
                }]
            }]
        }, { transaction });

        if (!profile) {
            throw new Error('Client profile by id not found')
        }


        const quarterAmountDue = profile.dataValues.totalAmountDue / 4

        if (quarterAmountDue === 0) {
            throw new Error('No amount due')
        }

        if (amount > quarterAmountDue) {
            throw new Error('Amount exceeds the 25% of the amount due')
        }

        profile.balance += amount

        await profile.save({ transaction })

        transaction.commit()
        res.json({ message: 'Deposit processed successfully' });
    } catch(error) {
        console.error(error);
        await transaction.rollback();
        res.status(404).json({ message: 'Transaction failed' });
    }
})

/**
 * @description Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
 */
app.get('/admin/best-profession', async (req, res) => {
    const { Profile, Job, Contract } = req.app.get('models')
    const { start, end } = req.query

    const theBestProfession = await Profile.findOne({
        attributes: [
            'id',
            'profession',
            [Sequelize.fn('SUM', Sequelize.col('Contractor.Jobs.price')), 'totalAmount']
        ],
        subQuery: false,
        include: [{
            model: Contract,
            as: 'Contractor',
            attributes: [],
            where: {
                status: 'in_progress'
            },
            include: [{ 
                model: Job,
                attributes: [],
                where: {
                    paid: true,
                    paymentDate: {
                        [Op.between]: [start, end]
                    }
                },
             }]
        }],
        group: ['profession'],
        order: [[Sequelize.literal('totalAmount'), 'DESC']],
    })

    res.json(theBestProfession)
})

app.get('/admin/best-clients', async (req, res) => {
    const { Profile, Job, Contract } = req.app.get('models')
    const { start, end, limit = 2 } = req.query

    const clientsRate = await Profile.findAll({
        attributes: [
            'id',
            [Sequelize.fn('concat', Sequelize.col('profile.firstName'), ' ', Sequelize.col('profile.lastName')), 'fullName'],
            [Sequelize.fn('SUM', Sequelize.col('Client.Jobs.price')), 'paid']
        ],
        subQuery: false,
        include: [{
            model: Contract,
            as: 'Client',
            attributes: [],
            where: {
                status: 'in_progress'
            },
            include: [{ 
                model: Job,
                attributes: [],
                where: {
                    paid: true,
                    paymentDate: {
                        [Op.between]: [start, end]
                    }
                },
             }]
        }],
        order: [[Sequelize.literal('paid'), 'DESC']],
        group: ['profile.id'],
        limit
    })

    res.json(clientsRate)
})

export default app;
