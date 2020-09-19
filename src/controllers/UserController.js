//  Loading database and bcryptjs modules
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

//	Loading User schema and Users collection from database
require("../models/User");
const users = mongoose.model("Users");

// Loading module to delete uploads
const fs = require("fs");

// Loading helpers
const regEx = require("../helpers/regEx");

const { findConnections, sendMessage } = require("../config/websocket");

//	Exporting User features
module.exports = {
	//	Return an user on database given email
	async index(req, res) {
		const userId = req.params.id;

		if(!userId || !userId.length || !mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).send("Invalid id!");
		}

		await users.findById(userId).then((user) => {
			if(user) {
				return res.status(200).json(user);
			} else {
				return res.status(400).send("No user found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	},

	//	Create a new user
	async create(req, res) {
		const { name, email, password, passwordC } = req.body;
		const filename = (req.file) ? req.file.filename : null;
		const sendSocketMessageTo = await findConnections();
		var errors = [];

		if(!name || !name.length) {
			errors.push("name");
		}

		if(!email || !email.length || !regEx.email.test(email)) {
			errors.push("email");
		}

		if(!password || !password.length || !regEx.password.test(password)) {
			errors.push("password");
		}

		if(!passwordC || !passwordC.length || !regEx.password.test(passwordC)) {
			errors.push("password confirmation");
		}

		if(errors.length) {
			if(filename) {
				fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
			}

			const message = "Invalid " + errors.join(", ") + " value" + (errors.length > 1 ? "s!" : "!");

			return res.status(400).send(message);
		}

		if(password !== passwordC) {
			if(filename) {
				fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
			}

			return res.status(400).send("The password confirmation don't match, try again!");
		}

		await users.findOne({ email: email.trim().toLowerCase() }).then((response) => {
			if(response) {
				if(filename) {
					fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
				}

				return res.status(400).send("There is a user using this email, try another!");
			} else {
				var salt = 0, hash = "";

				try {
					salt = bcrypt.genSaltSync(10);
					hash = bcrypt.hashSync(password, salt);
				} catch(error) {
					if(filename) {
						fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
					}

					return res.status(500).send(error.message);
				}

				users.create({
					name,
					email: email.trim().toLowerCase(),
					userType: 0,
					password: hash,
					thumbnail: filename
				}).then((response) => {
					if(response) {
						sendMessage(sendSocketMessageTo, "new-user", response);
						return res.status(201).json(response);
					} else {
						if(filename) {
							fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
						}

						return res.status(400).send("We couldn't process your request, try again later!");
					}
				}).catch((error) => {
					if(filename) {
						fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
					}

					return res.status(500).send(error);
				});
			}
		}).catch((error) => {
			if(filename) {
				fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
			}

			return res.status(500).send(error);
		});
	},

	//	Update current user on database
	async update(req, res) {
		const userId = req.headers.authorization;
		const { name, email, passwordO, passwordN, address, phone } = req.body;
		const filename = (req.file) ? req.file.filename : null;
		const sendSocketMessageTo = await findConnections();

		if(!userId || !userId.length || !mongoose.Types.ObjectId.isValid(userId)) {
			if(filename) {
				fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
			}

			return res.status(400).send("Invalid id!");
		}
		var errors = [];

		if(!name || !name.length) {
			errors.push("name");
		}

		if(!email || !email.length || !regEx.email.test(email)) {
			errors.push("email");
		}

		if(phone && phone.length && !regEx.phone.test(phone)) {
			errors.push("phone");
		}

		if(address && address.length && !regEx.address.test(address)) {
			errors.push("address");
		}

		if(errors.length) {
			if(filename) {
				fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
			}

			const message = "Invalid " + errors.join(", ") + " value" + (errors.length > 1 ? "s!" : "!");

			return res.status(400).send(message);
		}

		await users.findById(userId).then((user) => {
			if(user) {
				var hash = "";

				if(passwordN && passwordN.length) {
					if(!regEx.password.test(passwordN)) {
						if(filename) {
							fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
						}

						return res.status(400).send("Invalid new password!");
					}

					if(!bcrypt.compareSync(passwordO, user.password)) {
						if(filename) {
							fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
						}

						return res.status(400).send("Old password don't match, try again!");
					}

					try {
						const salt = bcrypt.genSaltSync(10);
						hash = bcrypt.hashSync(passwordN, salt);
					} catch(error) {
						if(filename) {
							fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
						}

						return res.status(500).send(error.message);
					}
				} else {
					hash = user.password;
				}

				user.name = name;
				user.email = email.trim().toLowerCase();
				user.password = hash;
				user.thumbnail = filename;
				user.phone = phone && phone.length ? phone : null;
				user.address= address && address.length ? address.split(",").map(a => a.trim()) : null;

				user.save().then((response) => {
					if(response) {
						users.find().sort({
							userType: "desc"
						}).then((response) => {
							sendMessage(sendSocketMessageTo, "update-user", response);
						}).catch((error) => {
							return res.status(500).send(error);
						});

						return res.status(200).send("Successful on changing your data!");
					} else {
						if(filename) {
							fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
						}

						return res.status(400).send("We couldn't save your changes, try again later!");
					}
				}).catch((error) => {
					if(filename) {
						fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
					}

					return res.status(500).send(error);
				});
			} else {
				if(filename) {
					fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
				}

				return res.status(404).send("User not found!" );
			}
		}).catch((error) => {
			if(filename) {
				fs.unlinkSync(`${__dirname}/../../uploads/${filename}`);
			}

			return res.status(500).send(error);
		});
	},

	//	Remove current user from database
	async delete(req, res) {
		const { password } = req.headers;
		const userId = req.headers.authorization;
		const sendSocketMessageTo = await findConnections();
		var errors = [];

		if(!userId || !userId.length || !mongoose.Types.ObjectId.isValid(userId)) {
			errors.push("id");
		}

		if(!password || !password.length) {
			errors.push("password");
		}

		if(errors.length) {
			const message = "Invalid " + errors.join(", ") + " value" + (errors.length > 1 ? "s!" : "!");

			return res.status(400).send(message);
		}

		await users.findById(userId).then((user) => {
			if(user) {
				if(user.userType === 2) {
					return res.status(401).send("Admin account can't be deleted");
				} else {
					bcrypt.compare(password, user.password).then((match) => {
						if(match) {
							user.remove().then((uDeleted) => {
								if(uDeleted){
									try {
										if(uDeleted.thumbnail){
											fs.unlinkSync(`${__dirname}/../../uploads/${uDeleted.thumbnail}`);
										}

										users.find().sort({
											userType: "desc"
										}).then((response) => {
											sendMessage(sendSocketMessageTo, "delete-user", response);
										}).catch((error) => {
											return res.status(500).send(error);
										});

										return res.status(200).send("The user has been deleted!");
									} catch(e) {
										return res.status(200).send("The user has been deleted, but the profile picture was not found!");
									}
								} else {
									return res.status(400).send("User not found!");
								}
							}).catch((error) => {
								return res.status(500).send(error);
							});
						} else {
							return res.status(400).send("Wrong password, try again!");
						}
					});
				}
			} else {
				return res.status(404).send("User not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	},

	//	Return all users on database
	async all(req, res) {
		await users.find().sort({
			userType: "desc"
		}).then((response) => {
			return res.status(200).json(response);
		}).catch((error) => {
			return res.status(500).send(error);
		});
	}
};