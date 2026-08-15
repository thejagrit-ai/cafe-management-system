import { Router } from 'express';
import { recipeController } from '../controllers/recipe';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRecipeSchema, updateRecipeSchema, recipeQuerySchema } from '../validators/recipe';
import { idParamSchema } from '../validators/auth';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'STAFF'), validate(recipeQuerySchema), recipeController.findAll);
router.get('/product/:productId', validate(idParamSchema), recipeController.findByProductId);
router.get('/:id', authenticate, authorize('ADMIN', 'STAFF'), validate(idParamSchema), recipeController.findById);
router.get('/:productId/check-stock', validate(idParamSchema), recipeController.checkStock);

router.post('/', authenticate, authorize('ADMIN'), validate(createRecipeSchema), recipeController.create);
router.put('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), validate(updateRecipeSchema), recipeController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), recipeController.delete);

export default router;