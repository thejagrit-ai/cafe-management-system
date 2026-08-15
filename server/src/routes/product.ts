import { Router } from 'express';
import { productController } from '../controllers/product';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProductSchema, updateProductSchema, productQuerySchema } from '../validators/product';
import { idParamSchema } from '../validators/auth';

const router = Router();

router.get('/', validate(productQuerySchema), productController.findAll);
router.get('/featured', productController.getFeatured);
router.get('/popular', productController.getPopular);
router.get('/category/:categoryId', validate(idParamSchema), validate(productQuerySchema), productController.getByCategory);
router.get('/:id', validate(idParamSchema), productController.findById);

router.post('/', authenticate, authorize('ADMIN'), validate(createProductSchema), productController.create);
router.put('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), validate(updateProductSchema), productController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), productController.delete);

export default router;