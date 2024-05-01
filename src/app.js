const express = require('express');
const bodyParser = require('body-parser');
const { Op } = require('sequelize')

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

module.exports = app;
