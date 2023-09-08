("use strict");
// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_KEY);
/**
 * order controller
 */

const { factories } = require("@strapi/strapi");
const { createCoreController } = factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { items } = ctx.request.body;
    try {
      const lineItems = await Promise.all(
        items.map(async (item) => {
          const product = await strapi
            .service("api::product.product")
            .findOne(item.id);

          console.log("this is item------->", item);
          console.log("this is product------->", product);

          return {
            price_data: {
              currency: "inr",
              product_data: {
                name: `${product.name} (${item.selectedSize})`,
              },
              unit_amount: Math.round(product.price * 100),
            },
            quantity: item.quantity,
          };
        })
      );

      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: { allowed_countries: ["IN"] },
        payment_method_types: ["card"],
        mode: "payment",
        success_url: process.env.CLIENT_URL + "/success",
        cancel_url: process.env.CLIENT_URL + "/failed",
        line_items: lineItems,
      });

      await strapi
        .service("api::order.order")
        .create({ data: { items, stripeId: session.id } });

      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return { error };
    }
  },
}));
