module.exports.extend = function extend(Promise) {
  Promise.prototype.nodeify = function nodeify(fn) {
    return this.then(function nodeify_resolve(result) {
      fn(null, result);
      return result;
    }, function nodeify_reject(err) {
      fn(err);
      throw err;
    });
  }
}