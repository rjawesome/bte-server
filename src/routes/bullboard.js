const { getQueryQueue } = require("../controllers/async/asyncquery_queue");
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const path = require('path');
const debug = require('debug')('bte:biothings-explorer-trapi:bullboard');

class RouteBullBoardPage {
  setRoutes(app) {
    debug("Initializing Bull Dashboard");
    const queues = {
      "/v1/asyncquery": getQueryQueue("bte_query_queue"),
      "/v1/smartapi/{smartapi_id}/asyncquery": getQueryQueue("bte_query_queue_by_api"),
      "/v1/team/{team_name}/asyncquery": getQueryQueue("bte_query_queue_by_team"),
    };

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/queues");

    const instance = {
      prod: "Prod",
      test: "Test",
      ci: "Staging",
      dev: "Dev"
    }[process.env.INSTANCE_ENV ?? 'dev']

    const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
      queues: Object.entries(queues).map(([name, queue]) => {
        const adapter = new BullAdapter(queue, {
          readOnlyMode: true,
          description: name,
        });
        adapter.setFormatter('name', (job) => `Asynchronous Request #${job.id}`);
        adapter.setFormatter('data', ({worker, ...rest}) => rest);
        return adapter;
      }),
      serverAdapter,
      options: {
        uiConfig: {
          boardTitle: `BTE ${instance}`,
        },
      },
    });

    app.use("/queues", serverAdapter.getRouter());
  }
}

module.exports = new RouteBullBoardPage();
