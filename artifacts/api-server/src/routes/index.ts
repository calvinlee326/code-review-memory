import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import reviewRouter from "./review.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reviewRouter);

export default router;
