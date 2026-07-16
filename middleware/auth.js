function requireLogin(req, res, next) {
  const isApi = req.path.startsWith('/api');
  if (!req.session.user) {
    return isApi ? res.status(401).json({ error: '請重新登入' }) : res.redirect('/login');
  }
  if (req.session.user.must_change_password && !req.path.startsWith('/change-password')) {
    return isApi ? res.status(401).json({ error: '請先設定新密碼' }) : res.redirect('/change-password');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    const isApi = req.path.startsWith('/api');
    return isApi ? res.status(403).json({ error: '權限不足' }) : res.status(403).send('權限不足');
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
