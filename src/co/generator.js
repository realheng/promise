import Promise from '../promise'

// it.next和it.throw起到一个承上启下的作用，给上一个yield左侧赋值，执行到下一个yield
const generateRandomNumberAry = function () {
  const results = []
  for (let index = 0; index < Math.random() * 5; index++) {
    results.push(Math.floor(Math.random() * 5))
  }
  return results
}

function fakeFetch () {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(generateRandomNumberAry())
    }, 500)
  })
}

function * gen () {
  console.log('启动！')
  const ary1 = yield fakeFetch()
  const ary2 = yield fakeFetch()
  const ary3 = yield fakeFetch()

  return [ary1, ary2, ary3]
}

function toPromise (value) {
  if (isPromise(value)) return value
  if (typeof value === 'function') return thunkPromise(value)
  return value
}

function thunkPromise (func) {
  return new Promise((resolve, reject) => {
    func(function (err, data) {
      if (err) {
        return reject(err)
      }
      resolve(data)
    })
  })
}

function isPromise (value) {
  return value && typeof value.then === 'function'
}

function co (gen) {
  const ctx = this
  const args = [].slice.call(arguments, 1)
  return new Promise(function (resolve, reject) {
    if (typeof gen === 'function') gen = gen.apply(ctx, args)
    if (!gen || typeof gen.next !== 'function') {
      return resolve(gen)
    }

    onFulfilled()

    function onFulfilled (res) {
      let ret
      try {
        ret = gen.next(res)
      } catch (error) {
        // 能进入这个条件语句说明gen里面没有捕获错误的语句
        reject(error)
      }
      // 就算捕获了错误但是还是进行next
      next(ret)
      return null
    }

    function onRejected (err) {
      let ret
      try {
        ret = gen.throw(err)
      } catch (error) {
        reject(error)
      }
      next(ret)
    }

    function next (ret) {
      if (ret.done) {
        return resolve(ret.value)
      }
      // yield 的值只能是promise或者函数
      // 函数的话接受一个node风格的callback
      // 如果是其他值的话就会报错

      const value = toPromise.call(ctx, ret.value)
      if (value && isPromise(value)) return value.then(onFulfilled, onRejected)
      return onRejected(
        new TypeError(
          'You may only yield a function, promise, generator, array, or object, ' +
            'but the following object was passed: "' +
            String(ret.value) +
            '"'
        )
      )
    }
  })
}

export default () => {
  co(gen).then(res => {
    console.log(res)
  })
}
