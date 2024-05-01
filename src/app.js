const express = require('express');
const bodyParser = require('body-parser');
const { Op, Transaction } = require('sequelize')

const { sequelize } = require('./model')
const { getProfile } = require('./middleware/getProfile')

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

module.exports = app;
