import { Router } from 'express';
import { ingredientController } from '../controllers/ingredient';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createIngredientSchema, updateIngredientSchema, ingredientQuerySchema, stockAdjustmentSchema } from '../validators/ingredient';
import { idParamSchema } from '../validators/auth';

const router = Router();

router.get('/', validate(ingredientQuerySchema), ingredientController.findAll);
router.get('/low-stock', authenticate, authorize('ADMIN', 'STAFF'), ingredientController.getLowStock);
router.get('/:id', validate(idParamSchema), ingredientController.findById);
router.get('/:id/transactions', authenticate, authorize('ADMIN', 'STAFF'), validate(idParamSchema), ingredientController.getTransactions);

router.post('/', authenticate, authorize('ADMIN'), validate(createIngredientSchema), ingredientController.create);
router.put('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), validate(updateIngredientSchema), ingredientController.update);
router.post('/:id/adjust-stock', authenticate, authorize('ADMIN', 'STAFF'), validate(idParamSchema), validate(stockAdjustmentSchema), ingredientController.adjustStock);

export default router;