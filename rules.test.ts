// https://firebase.google.com/docs/firestore/security/test-rules-emulator

import * as firebase from '@firebase/testing'
import * as fs from 'fs'
import { randomID } from './testHelper'

const projectID = 'moga-firestore-sample-project'
const databaseName = 'moga-firestore'
const rules = fs.readFileSync('./firestore.rules', 'utf8')

// firestore client for admin
const adminDB = firebase.initializeAdminApp({ projectId: projectID, databaseName }).firestore()

type Auth = {
  uid?: string,
  // other fields are used as request.auth.token in firestore.rules
  [key: string]: any
}

// firestore client for client-side user
const clientDB = (auth?: Auth) => firebase.initializeTestApp({ projectId: projectID, databaseName, auth }).firestore()

const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp()

// setup and clean up

beforeAll(async () => {
  await firebase.loadFirestoreRules({ projectId: projectID, rules })
})

beforeEach(async () => {
  await firebase.clearFirestoreData({ projectId: projectID })
})

afterAll(async () => {
  await Promise.all(firebase.apps().map(app => app.delete()))
})

describe('/users', () => {
  describe('update', () => {
    const userId = randomID()
    const db = clientDB({ uid: userId})

    describe('「groupCount」が更新されている', () => {
      describe('「updateAt」がリクエストした時間と一致していない', () => {
        it('更新できない', async () => {
          await configureTestData('users', userId)

          await firebase.assertFails(db.collection('users').doc(userId).set({
            groupCount: 1,
            updatedAt: 'failed'
          }))
        })
      })
      describe('「updateAt」がリクエストした時間と一致している', () => {
        it('更新できない', async () => {
          await configureTestData('users', userId)

          await firebase.assertFails(db.collection('users').doc(userId).set({
            groupCount: 1,
            updatedAt: serverTimestamp()
          }))
        })
      })
    })
    describe('「groupCount」が更新されていない', () => {
      describe('「updateAt」がリクエストした時間と一致していない', () => {
        it('更新できない', async () => {
          await configureTestData('users', userId)

          await firebase.assertFails(db.collection('users').doc(userId).set({
            groupCount: 0,
            updatedAt: 'failed'
          }))
        })
      })
      describe('「updateAt」がリクエストした時間と一致している', () => {
        it('更新できる', async () => {
          await configureTestData('users', userId)

          await firebase.assertSucceeds(db.collection('users').doc(userId).set({
            groupCount: 0,
            updatedAt: serverTimestamp()
          }))
        })
      })
    })
  })
})

function configureTestData(collectionId: string, documentId: string) {
  const db = adminDB

  return db.collection(collectionId).doc(documentId).set(createTestUser())
}

function createTestUser() {
  return {
    groupCount: 0,
    updatedAt: serverTimestamp()
  }
}
