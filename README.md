# DEEL BACKEND TASK

💫 Welcome! 🎉

This backend exercise involves building a Node.js/Express.js app that will serve a REST API. We imagine you should spend around 3 hours at implement this feature.


## Dev Notes

The following things was considered:

1. Use of transactions
> Some methods include transactions. I used transactions only for money operations. The simple endpoints were implemented without transactions because it can affect performance.

2. Sequelize
> My goal here was to avoid JS mappers and stuff like that. I have tried to implement all described endpoints only with Sequelize and SQL Queries.

3. Concurrency
> Unfortunately, the SQLite database doesn`t support isolation levels. But anyway I left a commented part of the code where I demonstrate what Isolation Level I would use

4. Code style
> To be honest I haven`t changed something here a lot. I have added the vital minimum of formatting tools (Eslint, Prettier) and have created the basic configuration files. No rocket science here. If I had more time I would like to adjust the eslint rules more accurately

5. Structure
> In my humble opinion, the structure should be considered based on the app size.  We have a small test application and I think that the structure should be simple. Without overheads at the moment.

> My thoughts. I have decided to leave the endpoints in the app.js file without dividing them by domain zones. The only thing that I did was put the SQL Queries into separate services. Probably it should be the crud services. But here I thought that we had no separate business logic and left it as is.

> It is not the best structure in the world but it`s suitable here. In case of growth of the app, we should consider the structure changes. For example, dividing the code on Controllers, Services and Cruds. And also we should it divide by domain zones. These changes already allow us to scale the app and it is only beginning!

6. Unit tests
> In the absence of TS, we should apply the unit testing for vital parts of business logic. Otherwise, we have a chance to break something or spend a lot of time on manual testing.

7. Frontend App
> I have preferred to create the front end rather than creating unit tests. It was a difficult choice for me. I have chosen to build the front-end app because I think this skill can tell more about me as an engineer. And of course, for you, it's more fun than unit tests. You can click the buttons! It's fun. Isn`t it?

## Data Models

> **All models are defined in src/model.js**

### Profile

A profile can be either a `client` or a `contractor`.
clients create contracts with contractors. contractor does jobs for clients and get paid.
Each profile has a balance property.

### Contract

A contract between and client and a contractor.
Contracts have 3 statuses, `new`, `in_progress`, `terminated`. contracts are considered active only when in status `in_progress`
Contracts group jobs within them.

### Job

contractor get paid for jobs by clients under a certain contract.

## Getting Set Up

The exercise requires [Node.js](https://nodejs.org/en/) to be installed. We recommend using the LTS version.

1. To install all dependencies and perform seeding, in the repo root directory, run `npm run setup`

2. Then run `npm start` which should start both the server and the React client.

❗️ **Make sure you commit all changes to the master branch!**

## Technical Notes

- The server is running with [nodemon](https://nodemon.io/) which will automatically restart for you when you modify and save a file.

- The database provider is SQLite, which will store data in a file local to your repository called `database.sqlite3`. The ORM [Sequelize](http://docs.sequelizejs.com/) is on top of it. You should only have to interact with Sequelize - **please spend some time reading sequelize documentation before starting the exercise.**

- To authenticate users use the `getProfile` middleware that is located under src/middleware/getProfile.js. users are authenticated by passing `profile_id` in the request header. after a user is authenticated his profile will be available under `req.profile`. make sure only users that are on the contract can access their contracts.
- The server is running on port 3001.

## APIs To Implement

Below is a list of the required API's for the application.

1. **_GET_** `/contracts/:id` - This API is broken 😵! it should return the contract only if it belongs to the profile calling. better fix that!

1. **_GET_** `/contracts` - Returns a list of contracts belonging to a user (client or contractor), the list should only contain non terminated contracts.

1. **_GET_** `/jobs/unpaid` - Get all unpaid jobs for a user (**_either_** a client or contractor), for **_active contracts only_**.

1. **_POST_** `/jobs/:job_id/pay` - Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.

1. **_POST_** `/balances/deposit/:userId` - Deposits money into the balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)

1. **_GET_** `/admin/best-profession?start=<date>&end=<date>` - Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.

1. **_GET_** `/admin/best-clients?start=<date>&end=<date>&limit=<integer>` - returns the clients the paid the most for jobs in the query time period. limit query parameter should be applied, default limit is 2.

```
 [
    {
        "id": 1,
        "fullName": "Reece Moyer",
        "paid" : 100.3
    },
    {
        "id": 200,
        "fullName": "Debora Martin",
        "paid" : 99
    },
    {
        "id": 22,
        "fullName": "Debora Martin",
        "paid" : 21
    }
]
```

## Going Above and Beyond the Requirements

Given the time expectations of this exercise, we don't expect anyone to submit anything super fancy, but if you find yourself with extra time, any extra credit item(s) that showcase your unique strengths would be awesome! 🙌

It would be great for example if you'd write some unit test / simple frontend demostrating calls to your fresh APIs.

## Submitting the Assignment

When you have finished the assignment, zip your repo (make sure to include .git folder) and send us the zip.

Thank you and good luck! 🙏
