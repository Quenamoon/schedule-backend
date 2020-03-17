const HttpStatus = require('http-status-codes')
const { createTkn } = require('../utils')

exports.login = async (req, res) => {
  try {
    const user = await req.db.User.findOne({ email: req.body.email })

    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found!'
      })
    }

    if (req.body.password !== user.password) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Incorrect password!'
      })
    }

    delete user._doc.password

    const token = createTkn(
      { ...user._doc, aud: req.config.TKN_AUD, iss: req.config.TKN_ISS },
      req.config.JWT_KEY
    )

    return res.status(HttpStatus.OK).json({
      success: true,
      token
    })
  } catch (error) {
    req.log.error(`Unable get user -> ${req.url} -> ${error}`)
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false
    })
  }
}

exports.register = async (req, res) => {
  try {
    const existingUser = await req.db.User.findOne({ email: req.body.email })

    if (existingUser) {
      return res.status(HttpStatus.CONFLICT).json({
        success: false,
        message: 'User already exists!'
      })
    }

    const user = await req.db.User.create(req.body)

    delete user._doc.password

    const token = createTkn(
      { ...user._doc, aud: req.config.TKN_AUD, iss: req.config.TKN_ISS },
      req.config.JWT_KEY
    )

    return res.json({
      success: true,
      token
    })
  } catch (error) {
    req.log.error(`Unable create user -> ${error}`)
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false
    })
  }
}

exports.resetPass = async (req, res) => {
  try {
    const userToSearchFor = { email: req.body.email, password: req.body.oldPass }
    const newUserToSearchFor = { email: req.body.email, password: req.body.newPass }
    const user = await req.db.User.findOne(userToSearchFor)
    if (user === null) {
      throw new Error('Wrong email or password')
    }
    const userChanged = await req.db.User.updateOne(userToSearchFor, { $set: { password: req.body.newPass } })
    if (userChanged.nModified !== 1) {
      throw new Error('Database couldn\'t update the password!')
    }
    const newUser = await req.db.User.findOne(newUserToSearchFor)

    const token = createTkn(
      { ...newUser._doc, aud: req.config.TKN_AUD, iss: req.config.TKN_ISS },
      req.config.JWT_KEY
    )

    return res.json({
      success: true,
      token
    })
  } catch (error) {
    req.log.error(`Unable to change pass -> ${error}`)
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false
    })
  }
}
