/**
 * What a person agrees to before the weekend league (Itzik, 27.10): the version they tick, the one address they
 * can write to, and whether the text of the two documents is in. The server asks for LEGAL_VERSION on every
 * registration (weekendCore), so the tick cannot be skipped by a client that does not show the box.
 */
import { LEGAL_VERSION } from './weekendCore.ts';

export { LEGAL_VERSION };
export const CONTACT_EMAIL = 'beapromanager@gmail.com';
