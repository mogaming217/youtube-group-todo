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

// setup and clean up

const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp()

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
  describe('create', () => {
    it('正しいデータであれば作成できる', async () => {
      const userID = randomID()
      const db = clientDB({ uid: userID })
      await firebase.assertSucceeds(db.collection('users').doc(userID).set({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
    })

    it('OK：名前20文字', async () => {
      const userID = randomID()
      const db = clientDB({ uid: userID })
      await firebase.assertSucceeds(db.collection('users').doc(userID).set({ name: '12345678901234567890', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))

    })

    it('間違ったデータだと失敗する', async () => {
      const userID = randomID()
      const db = clientDB({ uid: userID })
      await firebase.assertFails(db.collection('users').doc(userID).set({ name: 'moga' }))
      await firebase.assertFails(db.collection('users').doc(userID).set({ name: '123456789012345678901' }))
    })
  })
})

describe('/users/todos', () => {
  const userID = randomID()
  const db = clientDB({ uid: userID })

  describe('create', () => {
    it('作成できる', async () => {
      await firebase.assertSucceeds(
        db.collection('users').doc(userID).collection('todos').doc().set({
          title: '卵を買う',
          isCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      )
    })

    it('作成できる2', async () => {
      await firebase.assertSucceeds(
        db.collection('users').doc(userID).collection('todos').doc().set({
          title: '卵を買う',
          isCompleted: false,
          completedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      )
    })

    it('作成できない', async () => {
      await firebase.assertFails(
        db.collection('users').doc(userID).collection('todos').doc().set({
          isCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      )

      await firebase.assertFails(
        db.collection('users').doc(userID).collection('todos').doc().set({
          title: 'hey',
          isCompleted: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      )
    })
  })

  describe('update', () => {
    const todoID = randomID()

    beforeEach(async () => {
      // 事前にデータを作っておく
      await adminDB.collection('users').doc(userID).collection('todos').doc(todoID).set({
        title: '卵を買う',
        isCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    })

    it('completedにできる', async () => {
      await firebase.assertSucceeds(
        db.collection('users').doc(userID).collection('todos').doc(todoID).update({
          isCompleted: true,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      )
    })

    it('titleだけ変更できる', async () => {
      await firebase.assertSucceeds(
        db.collection('users').doc(userID).collection('todos').doc(todoID).update({
          title: 'にんにく買う',
          updatedAt: serverTimestamp()
        })
      )
    })

    it('completedだけ更新はできない', async () => {
      await firebase.assertFails(
        db.collection('users').doc(userID).collection('todos').doc(todoID).update({
          isCompleted: true,
          // completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      )
    })
  })
})
