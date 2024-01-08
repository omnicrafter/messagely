const express = require("express");
const router = new express.Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const ExpressError = require("../expressError");
const { SECRET_KEY } = require("../config");

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const authenticated = await User.authenticate(username, password);

    if (authenticated) {
      await User.updateLoginTimestamp(username);
      const token = jwt.sign({ username }, SECRET_KEY);
      return res.json({ message: "Logged in!", token });
    } else {
      throw new ExpressError("Invalid username/password", 400);
    }
  } catch (err) {
    return next(err);
  }
});
/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post("/register", async (req, res, next) => {
  try {
    const { username, password, first_name, last_name, phone } = req.body;
    const user = await User.register({
      username,
      password,
      first_name,
      last_name,
      phone,
    });

    // Sign the JWT with the username and a secret key
    const token = jwt.sign({ username }, SECRET_KEY);

    await User.updateLoginTimestamp(username);

    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
