const Apify = require("apify");

const LIMIT = 100;

const loadMoreUrl = (matchId, newest) => {
  return `https://shopee.vn/api/v2/search_items/?by=relevancy&limit=${LIMIT}&match_id=${matchId}&newest=${newest}&order=desc&page_type=shop&version=2`;
};

Apify.main(async () => {
  const productListDataset = await Apify.openDataset("PRODUCT_LIST");

  const input = await Apify.getInput();
  const sources = input.map(
    (matchId) =>
      `https://shopee.vn/api/v2/search_items/?by=relevancy&limit=${LIMIT}&match_id=${matchId}&newest=0&order=desc&page_type=shop&version=2`
  );

  const requestList = await Apify.openRequestList(
    "product-list-request",
    sources
  );

  const requestQueue = await Apify.openRequestQueue();
  // await requestQueue.addRequest({
  //   url: `https://shopee.vn/api/v2/search_items/?by=relevancy&limit=${LIMIT}&match_id=132715430&newest=0&order=desc&page_type=shop&version=2`,
  // });

  const handlePageFunction = async ({ request, json }) => {
    const { items } = json;

    if (items.length !== 0) {
      const itemIdCrawled = await productListDataset.map(
        async (item) => item.itemid
      );

      const newItems = items.filter((i) => !itemIdCrawled.includes(i.itemid));
      const results = newItems.map((i) => {
        return {
          itemid: i.itemid,
          shopid: i.shopid,
        };
      });
      await productListDataset.pushData(results);

      await requestQueue.addRequest({
        url: loadMoreUrl(
          new URL(request.url).searchParams.get("match_id"),
          Number(new URL(request.url).searchParams.get("newest")) + items.length
        ),
      });
    }
  };

  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    handlePageFunction,
    additionalMimeTypes: ["application/json"],
  });

  console.log("CRAWLER PRODUCT LIST ...");
  await crawler.run();
});
