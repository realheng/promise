// v是一个实例化的promise，且状态为fulfilled
let v = new Promise((resolve) => {
  console.log("begin");
  resolve("then");
});

// 在promise里面resolve一个状态为fulfilled的promise

// 模式一 new Promise里的resolve()
// begin->1->2->3->then->4 可以发现then推迟了两个时序
// 推迟原因：浏览器会创建一个 PromiseResolveThenableJob 去处理这个 Promise 实例，这是一个微任务。
// 等到下次循环到来这个微任务会执行，也就是PromiseResolveThenableJob 执行中的时候，因为这个Promise 实例是fulfilled状态，所以又会注册一个它的.then()回调
// 又等一次循环到这个Promise 实例它的.then()回调执行后，才会注册下面的这个.then(),于是就被推迟了两个时序
new Promise((resolve) => {
  // new出来promise的status为pending
  // resolve会推迟一个时序
  // 如果resolve的value是一个promise，会执行 value.then(resolve,reject)，等到value执行回调之后才会执行这个promise的then
  resolve(v);
}).then((v) => {
  console.log(v);
});

//  模式二 Promise.resolve(v)直接创建
// begin->1->then->2->3->4 可以发现then的执行时间正常了，第一个执行的微任务就是下面这个.then
// 原因：Promise.resolve()API如果参数是promise会直接返回这个promise实例，不会做任何处理
/*     Promise.resolve(v).then((v)=>{
        console.log(v)
    }); */

new Promise((resolve) => {
  console.log(1);
  resolve();
})
  .then(() => {
    console.log(2);
  })
  .then(() => {
    console.log(3);
  })
  .then(() => {
    console.log(4);
  });
