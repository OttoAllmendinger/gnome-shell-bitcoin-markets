const x = () => {
  let c = 0;
  return () => {
    c++;
    return c;
  }
}

const y = x();

log(y(y()) === 2 ? 'success' : 'fail');
