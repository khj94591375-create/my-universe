import { createContext } from 'react';

/** 지금 보는 작품 이름(AppShell이 넣고, ScreenLayout이 탭 제목에 쓴다) */
export const WorkTitleContext = createContext<string | null>(null);
