//  Loading database module
const mongoose = require("mongoose");

//	Loading Orders and Company collections from database
require("../models/Order");
require("../models/Company");
const orders = mongoose.model("Orders");
const companyData = mongoose.model("Company");

const { findConnections, sendMessage } = require("../config/websocket");

//	Exporting Order features
module.exports = {
	//	Return an order on database given id
	async index(req, res) {
		const userId = req.params.id;

		if(!userId || !userId.length || !mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).send("Invalid id!");
		}

		await orders.find({ "user._id": userId }).then((response) => {
			return res.status(200).json(response);
		}).catch((error) => {
			return res.status(500).send(error);
		});
	},

	//	Create a new order
	async create(req, res) {
		const { user, products, deliver, address } = req.body;
		const sendSocketMessageTo = await findConnections();

		if(!user || !products || !products.length) {
			return res.status(400).send("User or products are empty!");
		}

		if(deliver == null) {
			return res.status(400).send("Deliver is empty or wrong!");
		}

		if(deliver && (!address || !address.length)){
			return res.status(400).send("The delivery address is empty!");
		}

		//	Get freight price and add if deliver is true
		var total = await companyData.findOne({}).exec();
		total = (deliver) ? total.freight : 0.0;

		//	Calculate order total price
		for(var x of products) {
			if(x.size >= 0 && x.size < x.product.prices.length) {
				total += x.product.prices[x.size];
			} else {
				return res.status(400).send(`${x.product.name} size doesn't exist!`);
			}

			if(x.additions && x.additions.length) {
				for(var y of x.additions) {
						total += y.price;
				}
			}
		}

		await orders.create({
			user,
			products,
			total,
			deliver,
			address: deliver ? address.split(",").map(a => a.trim()) : null
		}).then((response) => {
			if(response) {
				sendMessage(sendSocketMessageTo, "new-order", response);
				return res.status(201).send("Order created successfully!");
			} else {
				return res.status(400).send("We couldn't create a new order, try again later!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	},

	//	Update current order status
	async update(req, res) {
		const orderId = req.params.id;
		const sendSocketMessageTo = await findConnections();

		const { status, feedback } = req.body;

		if(!orderId || !orderId.length || !mongoose.Types.ObjectId.isValid(orderId)) {
			return res.status(400).send("No order received!");
		}

		if(typeof status != "boolean") {
			return res.status(400).send("Status is empty!");
		}

		await orders.findById(orderId).then((order) => {
			if(order) {
				order.status = status;
				order.feedback = feedback ? feedback.trim() : null ;

				order.save().then((response) => {
					if(response) {
						sendMessage(sendSocketMessageTo, "update-order", response);
						return res.status(200).send("Successful on changing your data!");
					} else {
						return res.status(400).send("We couldn't save your changes, try again later!");
					}
				}).catch((error) => {
					return res.status(500).send(error);
				});
			} else {
				return res.status(404).send("User not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	},

	//	Delete all orders
	async delete(req, res) {
		const sendSocketMessageTo = await findConnections();
		await orders.deleteMany().then((response) => {
			if(response.n) {
				sendMessage(sendSocketMessageTo, "delete-user");
				return res.status(200).send("All orders have been deleted!");
			} else {
				return res.status(404).send("Orders not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	},

	//	Return all orders
	async all(req, res) {
		await orders.find().sort({
			status: "asc",
			creationDate: "desc"
		}).then((response) => {
			return res.status(200).json(response);
		}).catch((error) => {
			return res.status(500).send(error);
		});
	}
};