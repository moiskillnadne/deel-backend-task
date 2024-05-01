import { Op } from "sequelize"
import { Job, Contract, Profile, sequelize } from "../model.js"

export class JobService {
  /**
   * @param {string} profileId
   * @description The method finds all unpaid jobs for a user (either a client or contractor), for active contracts only.
   * @returns {Promise<Job[]>}
   */
  static async getAllUnpaid(profileId) {
    return Job.findAll({
      where: {
        paid: null,
      },
      include: [
        {
          model: Contract,
          attributes: [],
          where: {
            status: "in_progress",
            [Op.or]: [{ clientId: profileId }, { contractorId: profileId }],
          },
        },
      ],
    })
  }

  /**
   * @param {string} jobId
   * @param {string} profileId
   * @description The method pays for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.
   * @returns {Promise<{ isSuccess: boolean; message: string }>}
   */
  static async payForJobById(jobId, profileId) {
    if (!jobId || !profileId) {
      return {
        isSuccess: false,
        message: "Invalid job id or profile id",
      }
    }

    const transaction = await sequelize.transaction({
      // isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE -- Not supported by sqlite
    })

    try {
      const job = await Job.findOne(
        {
          // Find the job by id, that is unpaid and belongs to an active contract
          // and the client is the one making the payment
          where: {
            id: jobId,
            paid: null,
          },
          include: [
            {
              model: Contract,
              where: {
                status: "in_progress",
                clientId: profileId,
              },
            },
          ],
        },
        { transaction },
      )

      if (!job) {
        throw new Error("Unpaid job by job id not found")
      }

      const client = await Profile.findByPk(job.Contract.ClientId, { transaction })
      const contractor = await Profile.findByPk(job.Contract.ContractorId, { transaction })

      const amount = job.price

      if (client.balance < amount) {
        throw new Error("Insufficient funds")
      }

      client.balance -= amount // Decrease the balance of the client
      contractor.balance += amount // Increase the balance of the contractor

      await client.save({ transaction })
      await contractor.save({ transaction })

      // Update the job to be paid and set the payment date
      job.paid = true
      job.paymentDate = new Date()

      await job.save({ transaction })

      // Commit the transaction
      await transaction.commit()
      return {
        isSuccess: true,
        message: "Payment processed successfully",
      }
    } catch (error) {
      await transaction.rollback()
      console.error(error)

      return {
        isSuccess: false,
        message: "Transaction failed",
      }
    }
  }
}
