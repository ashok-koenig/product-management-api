const errorHandler = (err, req, res, next) => {
  const status = err.status ?? 500;
  res.status(status).json({
    success: false,
    data: null,
    error: err.message ?? 'Internal Server Error',
  });
};

export default errorHandler;
