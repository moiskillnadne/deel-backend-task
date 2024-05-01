import { Op } from 'sequelize'

import { Contract } from '../model.js'

export class ContractService {

  /**
    * @param {string} contractId
    * @param {string} profileId
    * @description The method finds the contract by id, only if the profile is part of the contract (as a client or the contractor).
    * @returns {Promise<Contract>}
  */
  static async getById(contractId, profileId) {
    if(!contractId || !profileId) return null
    
    return Contract.findOne({ 
        where: { 
            id: contractId, 
            [Op.or]: [ 
                { clientId: profileId },
                { contractorId: profileId } 
            ] 
        } 
      })
  }

  /**
   * @param {string} profileId
   * @description The method finds the contracts with status different from 'terminated' for a profile (as a client or the contractor).
   * @returns {Promise<Contract[]>}
  */
  static async getAllNotTerminatedByProfileId(profileId) {
    if(!profileId) return []

    return Contract.findAll({ 
      where: {
          [Op.not]: { status: 'terminated' },
          [Op.or]: [ 
              { clientId: profileId },
              { contractorId: profileId } 
          ] 
      } 
    })
  }
}