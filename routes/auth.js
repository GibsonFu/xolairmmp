const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { error: '請輸入帳號與密碼' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username.trim()]
  );
  const user = rows[0];
  if (!user) {
    return res.render('login', { error: '帳號或密碼錯誤' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.render('login', { error: '帳號或密碼錯誤' });
  }

  let isTeamLead = false;
  if (user.role === 'psr' && user.psr_code) {
    const { rows: psrRows } = await pool.query('SELECT is_team_lead FROM psrs WHERE code = $1', [user.psr_code]);
    isTeamLead = !!psrRows[0]?.is_team_lead;
  }

  req.session.user = {
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    psr_code: user.psr_code,
    must_change_password: user.must_change_password,
    is_team_lead: isTeamLead,
  };

  if (user.must_change_password) {
    return res.redirect('/change-password');
  }
  res.redirect('/');
}));

router.get('/change-password', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('change-password', { error: null, forced: req.session.user.must_change_password });
});

router.post('/change-password', asyncHandler(async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { current_password, new_password, confirm_password } = req.body;

  if (!new_password || new_password.length < 4) {
    return res.render('change-password', { error: '新密碼至少需要 4 碼', forced: req.session.user.must_change_password });
  }
  if (new_password !== confirm_password) {
    return res.render('change-password', { error: '兩次輸入的新密碼不一致', forced: req.session.user.must_change_password });
  }
  if (new_password === '0000') {
    return res.render('change-password', { error: '請勿使用預設密碼 0000，請設定新密碼', forced: req.session.user.must_change_password });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [req.session.user.username]);
  const user = rows[0];
  const ok = await bcrypt.compare(current_password || '', user.password_hash);
  if (!ok) {
    return res.render('change-password', { error: '目前密碼不正確', forced: req.session.user.must_change_password });
  }

  const newHash = await bcrypt.hash(new_password, 10);
  await pool.query(
    'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE username = $2',
    [newHash, user.username]
  );
  req.session.user.must_change_password = false;
  res.redirect('/');
}));

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
