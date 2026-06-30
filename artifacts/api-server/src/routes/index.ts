import { Router, type IRouter } from "express";
import healthRouter from "./health";
import arrivalsRouter from "./arrivals";
import locationRouter from "./location";
import pushRouter from "./push";
import statsRouter from "./stats";
import reportsRouter from "./reports";
import configRouter from "./config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(arrivalsRouter);
router.use(locationRouter);
router.use(pushRouter);
router.use(statsRouter);
router.use(reportsRouter);
router.use(configRouter);

export default router;
