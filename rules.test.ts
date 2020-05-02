// https://firebase.google.com/docs/firestore/security/test-rules-emulator

import * as firebase from '@firebase/testing'
import * as fs from 'fs'
import { randomID } from './testHelper'

const projectID = 'moga-firestore-sample-project'
const databaseName = 'moga-firestore'
const rules = fs.readFileSync('./firestore.rules', 'utf8')

// firestore client for admin
const adminDB = firebase.initializeAdminApp({ projectId: projectID, databaseName })

type Auth = {
  uid?: string,
  // other fields are used as request.auth.token in firestore.rules
  [key: string]: any
}

// firestore client for client-side user
const clientDB = (auth?: Auth) => firebase.initializeTestApp({ projectId: projectID, databaseName, auth }).firestore()

// setup and clean up

beforeAll(async () => {
  await firebase.loadFirestoreRules({ projectId: projectID, rules });
})

beforeEach(async () => {
  await firebase.clearFirestoreData({ projectId: projectID });
})

afterAll(async () => {
  await Promise.all(firebase.apps().map(app => app.delete()));
})

describe('/users', () => {
  it('ok: ', async () => {
    const userID = randomID()
    const db = clientDB({ uid: userID })
    await firebase.assertSucceeds(
      db.collection('users').doc(userID).set({ hello: 1 })
    )
  })

  it('ng: create', async () => {
    const userID1 = randomID()
    const db = clientDB({ uid: userID1 })
    const userID2 = randomID()
    await firebase.assertFails(
      db.collection('users').doc(userID2).set({ hello: 1 })
    )
  })
})
