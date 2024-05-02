import express from "express"
import bodyParser from "body-parser"
import cors from 'cors'

import { sequelize } from "./model.js"
import { getProfile } from "./middleware/getProfile.js"

import { ContractService } from "./services/contract.service.js"
import { JobService } from "./services/job.service.js"
import { ProfileService } from "./services/profile.service.js"

const app = express()

app.use(cors({
  origin: 'http://localhost:5173' 
}))
app.use(bodyParser.json())
app.set("sequelize", sequelize)
app.set("models", sequelize.models)

/**
 * @access GET /contracts/:id
 * @requires Authorization header with a valid profile id
 * @description The endpoint finds the contract by id, only if the profile is part of the contract (as a client or the contractor).
 * @returns One contract by id
 */
app.get("/contracts/:id", getProfile, async (req, res) => {
  const { id: contractId } = req.params
  const { id: profileId } = req.profile

  const contract = await ContractService.getById(contractId, profileId)

  if (!contract) return res.status(404).json({ message: "Not found" }).end()

  res.json(contract)
})

/**
 * @access GET /contracts
 * @requires Authorization header with a valid profile id
 * @description The endpoint finds the contracts with status different from 'terminated' for a profile (as a client or the contractor).
 * @returns List of contracts
 */
app.get("/contracts", getProfile, async (req, res) => {
  const { id: profileId } = req.profile

  const contracts = await ContractService.getAllNotTerminatedByProfileId(profileId)

  res.json(contracts)
})

/**
 * @access GET /jobs/unpaid
 * @requires Authorization header with a valid profile id
 * @description The endpoint finds all unpaid jobs for a user (either a client or contractor), for active contracts only.
 * @returns List of jobs
 */
app.get("/jobs/unpaid", getProfile, async (req, res) => {
  const { id: profileId } = req.profile

  const job = await JobService.getAllUnpaid(profileId)

  res.json(job)
})

/**
 * @access POST /jobs/:jobId/pay
 * @requires Authorization header with a valid profile id
 * @description Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.
 * @returns Transaction status { isSuccess: boolean; message: string }
 */
app.post("/jobs/:jobId/pay", getProfile, async (req, res) => {
  const { id: profileId } = req.profile
  const { jobId } = req.params

  const transactionResult = await JobService.payForJobById(jobId, profileId)

  if (!transactionResult.isSuccess) {
    return res.status(404).json({ message: transactionResult.message })
  }

  res.json({ message: "Job paid successfully" })
})

/**
 * @access POST /balances/deposit/:userId
 * @body { amount: number }
 * @description Deposits money into the balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
 * @returns Transaction status { isSuccess: boolean; message: string }
 */
app.post("/balances/deposit/:userId", async (req, res) => {
  const { userId } = req.params
  const { amount } = req.body

  const transactionResult = await ProfileService.deposit(userId, amount)

  if (!transactionResult.isSuccess) {
    return res.status(404).json({ message: transactionResult.message })
  }

  res.json({ message: "Deposit successful" })
})

/**
 * @access GET /admin/best-profession
 * @query { start: string, end: string }
 * @description Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
 * @returns The custom profession DTO or null
 */
app.get("/admin/best-profession", async (req, res) => {
  const { start, end } = req.query

  const theBestProfession = await ProfileService.getBestProfession(start, end)

  if (!theBestProfession) {
    return res.status(404).json({ message: "Not found" })
  }

  res.json(theBestProfession)
})

/**
 * @access GET /admin/best-clients
 * @query { start: string, end: string, limit: number }
 * @description Returns the clients that paid the most for jobs in the query time range.
 * @returns Array of the custom best clients DTO
 */
app.get("/admin/best-clients", async (req, res) => {
  const { start, end, limit } = req.query

  const clientsRate = await ProfileService.getBestClients(start, end, limit)

  res.json(clientsRate)
})

/**
 * @access GET /profile/login
 * @body { profileId: string }
 * @description Returns the profile by id
 * @returns Profile
 */
app.post("/profile/login", async (req, res) => {
  const { profileId } = req.body

  const profile = await ProfileService.login(profileId)

  if(!profile) {
    return res.status(404).json({ isSuccess: false, message: `Profile with id = ${profileId} not found` })
  }

  return res.json({ isSuccess: true, profile })
})

export default app
