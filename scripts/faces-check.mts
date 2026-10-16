/**
 * The faces of the people who talk to the manager (Itzik, 16.10, phase 2).
 *   node --experimental-strip-types scripts/faces-check.mts
 *
 * Held here: every portrait the table names exists on disk and every file on disk is named in the table; every speaker has at
 * least one face in each world; ליגה ג׳ to א׳ get the neighbourhood faces and the Leumit and ליגת העל the professional ones;
 * a message keeps its face and the faces vary across seasons; the dilemma screen and the inbox draw the face through the
 * component that falls back to the icon.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { FACES, faceFor, faceWorld, allFaces } from '../src/ui/faces.ts';
import { SPEAKER_LABEL } from '../src/data/dilemmas.ts';
import type { Speaker } from '../src/data/dilemmas.ts';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };

const speakers = Object.keys(SPEAKER_LABEL) as Speaker[];
ok(speakers.every(s => s in FACES), 'a speaker has no row in the face table');
for (const s of speakers) ok(FACES[s].low >= 1 && FACES[s].pro >= 1, `${s}: no face in one of the worlds`);
for (const url of allFaces()) ok(existsSync('public' + url), `missing ${url}`);
const onDisk = readdirSync('public/faces').filter(f => f.endsWith('.webp')).map(f => '/faces/' + f).sort();
ok(onDisk.join() === [...allFaces()].sort().join(), 'the files in public/faces and the face table do not match');

for (const tier of [1, 2, 3]) ok(faceWorld(tier) === 'low', `tier ${tier} is not the neighbourhood world`);
for (const tier of [4, 5]) ok(faceWorld(tier) === 'pro', `tier ${tier} is not the professional world`);
ok(faceFor('owner', 1, 5)!.includes('-low-') && faceFor('owner', 5, 5)!.includes('-pro-'), 'the owner of ליגה ג׳ and of ליגת העל wear the same face');
ok(faceFor('owner', 3, 9) === faceFor('owner', 3, 9), 'the same message changes its face');
{
  const seen = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) seen.add(faceFor('owner', 1, seed)!);
  ok(seen.size === FACES.owner.low, `over 60 seasons the owner showed ${seen.size} faces of ${FACES.owner.low}`);
}

const dil = readFileSync('src/ui/screens/Dilemma.tsx', 'utf8');
const inbox = readFileSync('src/ui/screens/Inbox.tsx', 'utf8');
const face = readFileSync('src/ui/components/Face.tsx', 'utf8');
ok(/<Face src=\{faceFor\(d\.speaker, G\.club\(gs\)\.tier/.test(dil), 'the dilemma screen does not draw the face by the division');
ok(/<Face src=\{faceFor\(m\.speaker, G\.club\(gs\)\.tier/.test(inbox), 'the inbox does not draw the face by the division');
ok(/onError=\{\(\) => setBroken\(true\)\}/.test(face) && /<Icon name=\{icon\}/.test(face), 'the face does not fall back to the icon');

console.log(`${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 10).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, every speaker has a face in both worlds, by division, and keeps it');
process.exit(fails.length ? 1 : 0);
