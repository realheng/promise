// 定义promise的三种状态
const REJECTED = 'REJECTED'
const RESOLVED = 'RESOLVED'
const PENDING = 'PENDING'
// promise为rejected的几种情况
// 在promise1中，只有executor执行出错（仅限于同步代码抛出错误）、手动reject、resolve的value是promise，且状态为rejected时promise1才会为rejected
// 或者then方法传入的onResolved和onRejected执行过程出错或者主动抛出错误时，或者x为promise，且promise的状态为rejected，promise2的状态才为rejected
// promise1的executor同步错误无法被then方法的onRejected捕获，因为当时错误回调还未被注册
// 异步错误只能手动reject捕获

// 实现promise需要注意的点
// 四个异步执行
// resolvePromise里面的三个called
// promise的三种状态

export default function Promise (executor) {
  if (typeof executor !== 'function') {
    throw new Error('Promise must be called on function')
  }

  const self = this
  // promise状态
  this.status = PENDING
  this.onRejectedCallbacks = []
  this.onResolvedCallbacks = []
  this.value = undefined
  this.reason = undefined

  function resolve (value) {
    // resolve推迟一个时序
    setTimeout(() => {
      if (value instanceof Promise) {
        // 如果value是一个promise，且状态确定了，则再推迟一个时序执行
        return value.then(resolve, reject)
      }
      if (self.status === PENDING) {
        self.status = RESOLVED
        self.value = value
        const length = self.onResolvedCallbacks.length
        for (let index = 0; index < length; index++) {
          const func = self.onResolvedCallbacks[index]
          func(value)
        }
      }
    })
  }

  function reject (reason) {
    setTimeout(() => {
      if (self.status === PENDING) {
        self.status = REJECTED
        self.reason = reason
        const length = self.onRejectedCallbacks.length
        if (!length) {
          console.error(reason)
        }
        for (let index = 0; index < length; index++) {
          const func = self.onRejectedCallbacks[index]
          func(reason)
        }
      }
    })
  }

  try {
    executor(resolve, reject)
  } catch (error) {
    reject(error)
  }
}

Promise.prototype.finally = function (callback) {
  callback = typeof callback === 'function' ? callback : function () {}
  return this.then(
    data => {
      return Promise.resolve(callback()).then(() => data)
    },
    err => {
      return Promise.resolve(callback()).then(() => {
        throw err
      })
    }
  )
}
// then方法用来注册在promise1状态确定后的回调
// then返回的promise2的状态取决于promise1调用then时传入的onResolved或onRejected的返回值
// 注意：promise1的状态由传入promise1的executor来决议的
Promise.prototype.then = function (onResolved, onRejected) {
  const self = this
  // then方法会返回一个Promise，即此处的promise2
  let promise2

  // 完成值的穿透
  // 如果then什么参数都没有的话还是可以向后传值的
  onResolved = typeof onResolved === 'function' ? onResolved : v => v
  // 如果是错误的话则抛出,因为抛出错误的话返回的promise2就直接reject
  onRejected =
    typeof onRejected === 'function'
      ? onRejected
      : r => {
          throw r
        }

  // promise有三种不同的状态
  // 注册回调的时三种状态都有可能
  if (self.status === RESOLVED) {
    promise2 = new Promise((resolve, reject) => {
      // 如果是resolved状态,那么会延迟一个微任务执行
      setTimeout(() => {
        try {
          const x = onResolved(self.value)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    })
  }
  if (self.status === REJECTED) {
    promise2 = new Promise((resolve, reject) => {
      // 如果是rejected状态,那么会延迟一个微任务执行
      setTimeout(() => {
        try {
          const x = onRejected(self.reason)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  if (self.status === PENDING) {
    // 如果是pending状态，那么promise1的最终状态是未知的
    // 所以需要添加回调函数，当状态决议时触发回调
    // 如果是pending状态,那么就不需要手动延迟执行
    promise2 = new Promise((resolve, reject) => {
      self.onResolvedCallbacks.push(function (value) {
        try {
          const x = onResolved(value)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })

      self.onRejectedCallbacks.push(function (reason) {
        try {
          const x = onRejected(reason)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  return promise2
}

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
}

Promise.resolve = function (value) {
  // resolve会判断value是不是promise 如果是的话直接返回
  if (value instanceof Promise) return value
  return new Promise(resolve => {
    resolve(value)
  })
}

Promise.reject = function (reason) {
  return new Promise((resolve, reject) => {
    reject(reason)
  })
}

Promise.defer = Promise.deferred = function () {
  let dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}

// 用一个外部变量count来维护
// 仅当count等于传入的promise数组的长度时才resolve
Promise.all = function (promises) {
  if (!Array.isArray(promises)) {
    throw new Error('promise.all must be called on promise array')
  }
  return new Promise((resolve, reject) => {
    const result = []
    let count = 0
    for (let index = 0; index < promises.length; index++) {
      const promise = promises[index]
      promise.then(data => {
        result[index] = data
        if (++count >= promises.length) {
          resolve(result)
        }
      }, reject)
    }
  })
}

Promise.race = function (promises) {
  if (!Array.isArray(promises)) {
    throw new Error('promise.all must be called on promise array')
  }
  return new Promise((resolve, reject) => {
    for (let index = 0; index < promises.length; index++) {
      const promise = promises[index]
      promise.then(data => {
        resolve(data)
      }, reject)
    }
  })
}

function resolvePromise (promise2, x, resolve, reject) {
  // 如果onResolved和onRejected的返回值x是一个promise，可能是我们自定义的，也可能是es6自带的，也可能是第三方库实现的
  // 那么就需要特殊处理，用x.then来决议promise2的状态
  // promise2是用来判断是否处于链式循环的
  // resolve和reject都是promise2的决议函数，透传进来决议promise2的状态

  let then
  // 第三方库实现的onResolved和onRejected可能被执行多次
  let thenCalledOrThrow = false

  // 禁止链式循环
  if (promise2 === x) {
    return reject(new TypeError('chaining cycle detected for promise!'))
  }

  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    // 进入这个判断就说明x是一个类promise
    try {
      then = x.then
      if (typeof then === 'function') {
        // 相等于我们实现的promise里面的返回值解析
        then.call(
          x,
          function rs (y) {
            if (thenCalledOrThrow) return
            thenCalledOrThrow = true
            // 如果此时y还是promise
            // 那么就会一直解析下去，直至resolve出一个非promise值，或者中途reject
            return resolvePromise(promise2, y, resolve, reject)
          },
          function rj (r) {
            if (thenCalledOrThrow) return
            thenCalledOrThrow = true
            return reject(r)
          }
        )
      } else {
        resolve(x)
      }
    } catch (error) {
      if (thenCalledOrThrow) {
        return
      }
      thenCalledOrThrow = true
      return reject(error)
    }
  } else {
    resolve(x)
  }
}
