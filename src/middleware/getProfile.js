/**
 * Middleware function to get the profile.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise<void>} - A promise that resolves when the middleware is complete.
 */
export const getProfile = async (req, res, next) => {
  const { Profile } = req.app.get("models")
  const profile = await Profile.findOne({ where: { id: req.get("profile_id") || 0 } })
  if (!profile) return res.status(401).end()
  req.profile = profile
  next()
}
