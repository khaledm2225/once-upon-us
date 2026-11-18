import { defineComponents } from '@iwsdk/core';

import { AlbumPrint } from './book/album-components.js';
import { CornerHandle, Leaf, TurnTab } from './book/book-components.js';
import { TextLine } from './book/text-components.js';
import { PopLayer, SceneMotion } from './popup/popup-components.js';

// Our ECS components, registered so the runtime and the scene editor know them.
export default defineComponents([Leaf, CornerHandle, TurnTab, PopLayer, SceneMotion, AlbumPrint, TextLine]);
