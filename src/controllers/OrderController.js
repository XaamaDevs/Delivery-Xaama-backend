//  Loading database module
const mongoose = require("mongoose");

//	Loading Orders and Company collections from database
require("../models/Order");
require("../models/Company");
require("../models/User");
const orders = mongoose.model("Orders");
const companyData = mongoose.model("Company");
const users = mongoose.model("Users");

//	Exporting Order features
module.exports = {
	//	Return an order on database given id
	async index(req, res) {
		const orderId = req.params.id;
		const userId = req.headers.authorization;

		if(!userId || !userId.length) {
			return res.status(400).send("No user is logged in!");
		}

		const user = await users.findById(userId);
		
		await orders.findById(orderId).then((order) => {
			if(order) {
				if(order.user._id == userId || user.userType == 1 || user.userType == 2) {
					return res.status(200).json(order);
				} else {
					return res.status(401).send("You don't have permission to access this order!");
				}
			} else {
				return res.status(400).send("Order not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	},

	//	Create a new order
	async create(req, res) {
		const { user, products, deliver } = req.body;

		if(!user || !products) {
			return res.status(400).send("User or products are empty!");
		}

		//	Get freight price and add if deliver is true
		var total = await companyData.findOne({}).exec();
		total = (deliver) ? total.freight : 0.0;

		//	Calculate products and its additions total price
		for(var x of products) {
			for(var y of x.additions) {
				if(x.size >= 0 && x.size < x.product.prices.length) {
					total += (x.product.prices[x.size] + y.price);
				} else {
					return res.status(400).send(`${x.product.name} size doesn't exist!`);
				}
			}
		}

		await orders.create({
			user,
			products,
			total
		}).then((response) => {
			if(response) {
				return res.status(201).send("Order created successfully!");
			} else {
				return res.status(400).send("We couldn't create a new order, try again later!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	},

	//	Delete a specific order
	async delete(req, res) {
		const orderId = req.params.id;

		await orders.findOneAndDelete({ _id: orderId }).then((response) => {
			if(response) {
				return res.status(200).send("The order has been deleted!");
			} else {
				return res.status(400).send("Order not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	},
	
	//	Return all orders
	async all(req, res) {
		await orders.find().sort({ 
			creationDate: "asc" 
		}).then((response) => {
			if(response && response.length ) {
				return res.status(200).json(response);
			} else {
				return res.status(400).send("Orders not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	}
};