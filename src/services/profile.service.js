import { Sequelize, Op } from "sequelize"
import { Job, Contract, Profile, sequelize } from "../model.js"

export class ProfileService {
  /**
   * @param {string} profileId
   * @param {number} amount
   * @description The method deposits money into the balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
   * @returns {Promise<{ isSuccess: boolean; message: string }>}
   */
  static async deposit(profileId, amount) {
    if (!profileId || !amount) {
      return {
        isSuccess: false,
        message: "Invalid profile id or amount",
      }
    }

    const transaction = await sequelize.transaction({
      // isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ // -- Not supported by sqlite
    })

    try {
      const profile = await Profile.findOne(
        {
          where: { id: profileId, type: "client" },
          attributes: ["id", "balance", [Sequelize.fn("SUM", Sequelize.col("Client.Jobs.price")), "totalAmountDue"]],
          include: [
            {
              model: Contract,
              as: "Client",
              where: { status: "in_progress" },
              attributes: [],
              include: [
                {
                  model: Job,
                  where: { paid: null },
                  attributes: [],
                },
              ],
            },
          ],
        },
        { transaction },
      )

      if (!profile) {
        throw new Error("Client profile by id not found")
      }

      const quarterAmountDue = profile.dataValues.totalAmountDue / 4

      if (quarterAmountDue === 0) {
        throw new Error("No amount due")
      }

      if (amount > quarterAmountDue) {
        throw new Error("Amount exceeds the 25% of the amount due")
      }

      profile.balance += amount

      await profile.save({ transaction })

      transaction.commit()
      return {
        isSuccess: true,
        message: "Deposit processed successfully",
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

  /**
   * @param {string} startDate - Date string
   * @param {string} endDate - Date string
   * @description The method returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
   * @returns {Promise<{ id: string; profession: string; totalAmount: number } | null>}
   */
  static async getBestProfession(startDate, endDate) {
    if (!startDate || !endDate) return null

    return Profile.findOne({
      attributes: ["id", "profession", [Sequelize.fn("SUM", Sequelize.col("Contractor.Jobs.price")), "totalAmount"]],
      subQuery: false,
      include: [
        {
          model: Contract,
          as: "Contractor",
          attributes: [],
          where: {
            status: "in_progress",
          },
          include: [
            {
              model: Job,
              attributes: [],
              where: {
                paid: true,
                paymentDate: {
                  [Op.between]: [startDate, endDate],
                },
              },
            },
          ],
        },
      ],
      group: ["profession"],
      order: [[Sequelize.literal("totalAmount"), "DESC"]],
    })
  }

  /**
   * @param {string} startDate - Date string
   * @param {string} endDate - Date string
   * @param {number} limit - Number of clients to return
   * @description The method returns the best clients in the query time range.
   * @returns {Promise<Array<{ id: string; fullName: string; paid: number }>>}
   */
  static async getBestClients(startDate, endDate, limit = 2) {
    if (!startDate || !endDate) return []

    return Profile.findAll({
      attributes: [
        "id",
        [
          Sequelize.fn("concat", Sequelize.col("profile.firstName"), " ", Sequelize.col("profile.lastName")),
          "fullName",
        ],
        [Sequelize.fn("SUM", Sequelize.col("Client.Jobs.price")), "paid"],
      ],
      subQuery: false,
      include: [
        {
          model: Contract,
          as: "Client",
          attributes: [],
          where: {
            status: "in_progress",
          },
          include: [
            {
              model: Job,
              attributes: [],
              where: {
                paid: true,
                paymentDate: {
                  [Op.between]: [startDate, endDate],
                },
              },
            },
          ],
        },
      ],
      order: [[Sequelize.literal("paid"), "DESC"]],
      group: ["profile.id"],
      limit,
    })
  }

  /**
   * @param {string} profileId - The profile id
   * @description The method find profile by id
   * @returns {Promise<Profile | null>}
   */
  static login(profileId) {
    if(!profileId) return null 

    return Profile.findByPk(profileId)
  }
}
