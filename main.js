const Apify = require("apify");

const LIMIT = 100;

const loadMoreUrl = (matchId, newest) => {
  return `https://shopee.vn/api/v2/search_items/?by=relevancy&limit=${LIMIT}&match_id=${matchId}&newest=${newest}&order=desc&page_type=shop&version=2`;
};

Apify.main(async () => {
  const dataset = await Apify.openDataset('PRODUCT_LIST');

  const input = await Apify.getInput();
  const sources = input.map(
    (matchId) =>
      `https://shopee.vn/api/v2/search_items/?by=relevancy&limit=${LIMIT}&match_id=${matchId}&newest=0&order=desc&page_type=shop&version=2`
  );

  const requestList = await Apify.openRequestList("my-request-list", sources);

  const requestQueue = await Apify.openRequestQueue();
  // await requestQueue.addRequest({
  //   url: `https://shopee.vn/api/v2/search_items/?by=relevancy&limit=${LIMIT}&match_id=132715430&newest=0&order=desc&page_type=shop&version=2`,
  // });

  const handlePageFunction = async ({ request, json }) => {
    const { items } = json;
    const matchId = new URL(request.url).searchParams.get("match_id");

    if (items.length !== 0) {
      const results = items.map((i) => {
        return {
          itemid: i.itemid,
          shopid: matchId,
        };
      });
      await dataset.pushData(results);

      await requestQueue.addRequest({
        url: loadMoreUrl(
          matchId,
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

  await crawler.run();
});
