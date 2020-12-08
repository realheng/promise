// 让生成器自动执行的关键是要需要一个next函数
// yield的返回值需要接受这个next函数
// next函数的参数是(error,data)这种形式
// next函数的的作用是让迭代器能够继续执行

function Thunk (fn) {
  return function (...args) {
    return function (callback) {
      return fn.call(this, ...args, callback)
    }
  }
}

function run (fn) {
  let gen = fn()
  function next (err, data) {
    let result = gen.next(data)

    if (result.done) return
    // 这里的result.value
    result.value(next)
  }

  next()
}

// 使用thunk方法
const request = require('request')
const requestThunk = Thunk(request)

function * requestGen () {
  const url = 'https://www.baidu.com'

  let r1 = yield requestThunk(url)
  console.log(r1.body)

  let r2 = yield requestThunk(url)
  console.log(r2.body)

  let r3 = yield requestThunk(url)
  console.log(r3.body)
}

// 启动运行
run(requestGen)
