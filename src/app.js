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

module.exports = app;
