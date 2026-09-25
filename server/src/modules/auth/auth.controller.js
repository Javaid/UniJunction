const authService = require('./auth.service');

const register = async (req, res, next) => {
  try {
    const { email, password, first_name: firstName, last_name: lastName } = req.body;
    const user = await authService.register({ email, password, firstName, lastName });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, expiresIn, user } = await authService.login(req.body);

    res.status(200).json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      user,
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, expiresIn } = await authService.refresh(req.body.refresh_token);

    res.status(200).json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.refresh_token);
    res.status(200).json({ success: true, message: 'Logged out.' });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const verified = await authService.verifyEmailToken(req.body.token);
    // Same response whether the token was valid or not (§7): never
    // reveal whether an arbitrary token exists.
    res.status(200).json({
      success: verified,
      message: verified
        ? 'Email verified successfully.'
        : 'This verification link is invalid or has expired.',
    });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    await authService.requestResendVerification(req.body.email);
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists and is not yet verified, a verification email has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.internalId);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refresh, logout, verifyEmail, resendVerification, me };
