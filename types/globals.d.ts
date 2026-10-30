/* Globals the app files share through window (each file is a plain script). Kept loose on purpose: the checker's job
   here is to catch typos, wrong argument counts and impossible code, not to type every screen. */
declare var Store: any, SRS: any, Learn: any, AI: any, Content: any, Games: any, Game: any, UI: any, Audio2: any, App: any, Talk: any, Sync: any;
declare var HanziWriter: any;
interface Window { [key: string]: any }
/* Page elements are looked up by id and used as inputs, buttons and so on: treat them loosely. */
interface Document { getElementById(elementId: string): any; querySelector(selectors: string): any; querySelectorAll(selectors: string): any }
interface Element { querySelector(selectors: string): any; querySelectorAll(selectors: string): any; closest(selectors: string): any }
interface EventTarget { [key: string]: any }
interface HTMLElement { [key: string]: any }
interface Element { [key: string]: any }
