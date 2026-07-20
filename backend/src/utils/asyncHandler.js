// Wraps an async controller so rejected promises go to Express's error
// handler instead of crashing the request unhandled.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
