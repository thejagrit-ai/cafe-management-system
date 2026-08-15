import { Router } from 'express';
import { categoryController } from '../controllers/category';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCategorySchema, updateCategorySchema, categoryQuerySchema } from '../validators/category';
import { idParamSchema } from '../validators/auth';

const router = Router();

router.get('/', validate(categoryQuerySchema), categoryController.findAll);
router.get('/active', categoryController.findAllActive);
router.get('/:id', validate(idParamSchema), categoryController.findById);

router.post('/', authenticate, authorize('ADMIN'), validate(createCategorySchema), categoryController.create);
router.put('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), validate(updateCategorySchema), categoryController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), categoryController.delete);

export default router;