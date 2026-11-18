import { defineComponents } from '@iwsdk/core';

import { CornerHandle, Leaf } from './book/book-components.js';

// Our ECS components, registered so the runtime and the scene editor know them.
export default defineComponents([Leaf, CornerHandle]);
