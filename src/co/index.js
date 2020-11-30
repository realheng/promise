import Promise from "../promise";

export default function co(gen) {
  // 通常情况下，co返回的promise的值为gen返回的值，未返回时为undefined
  // 如果执行过程中抛出错误或者promise被决议为rejected

  return new Promise(function (resolve, reject) {
    let it;
    if (typeof gen === "function") it = gen();

    // 如果 gen 不是一个迭代器
    if (!it || typeof it.next !== "function") return resolve(gen);
    // 以上为参数判断
    onFulfilled();

    // 当生成器函数里的错误没有被try catch 或者被catch 抛出
    // onFulFilled和onRjected里的try catch就会捕获到，然后将co的状态设置为rejected
    function onFulfilled(res) {
      //  onFufilled的参数就是promise的值
      var result;
      try {
        result = it.next(res);
      } catch (e) {
        // 如果执行过程中出错，且生成器函数未捕获或捕获抛出，就会被这里捕获
        return reject(e);
      }
      next(result);
    }

    function onRejected(err) {
      var result;
      try {
        result = it.throw(err);
        // it.throw不会浪费一个await，会一直执行到下一个yield或者gen的结尾
      } catch (e) {
        // 如果执行过程中出错，且生成器函数未捕获或捕获抛出，就会被这里捕获
        // 在这里被直接reject
        // 抛出错误之后生成器函数就不会再执行了
        return reject(e);
      }
      next(result);
    }

    function next(ret) {
      // 递归的终止条件,如果ret.done为true,那么就决议promise的状态
      if (ret.done) return resolve(ret.value);
      // 将ret.value转换为promise，无论ret.value是不是一个promise
      // 转换为promise的目的是为了promise的状态被决议时执行注册的回调函数
      var value = toPromise(ret.value);
      // 向前一步
      // 在promise1里面，如果executor里面的决议值是一个promisex
      // 那么promise1的状态由promisex的状态决议
      if (value && isPromise(value)) return value.then(onFulfilled, onRejected);
      return onRejected(
        new TypeError(
          "You may only yield a function, promise " +
            'but the following object was passed: "' +
            String(ret.value) +
            '"'
        )
      );
    }
  });
}
export function run(gen) {
  return new Promise(function (resolve, reject) {
    let it;
    if (typeof gen === "function") it = gen();

    // 如果 it 不是一个迭代器,直接将值resolve
    if (!it || typeof it.next !== "function") return resolve(gen);

    // 以上为参数判断
    function next(data) {
      let ret;
      try {
        ret = it.next(data);
      } catch (error) {
        reject(error);
      }
      if (ret.done) {
        return resolve(ret.value);
      }
      const value = toPromise(ret.value);
      value.then(next, reject);
    }

    next();
  });
}
// 判断传入的obj是否为promise实例
function isPromise(obj) {
  return "function" === typeof obj.then;
}

// 将obj转换为promise
function toPromise(obj) {
  if (isPromise(obj)) return obj;
  if ("function" === typeof obj) return thunkToPromise(obj);
  // 如果不是一个promise
  return Promise.resolve(obj);
}

// 传入的fn肯定是一个通过thunk转换过后的node风格的函数
function thunkToPromise(fn) {
  return new Promise(function (resolve, reject) {
    // 一般的回调都是node风格
    // 第一个参数是错误，第二个参数是值
    fn(function (err, res) {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

function thunk(fn) {
  return function (...args) {
    return function (callback) {
      fn.call(this, ...args, callback);
    };
  };
}
