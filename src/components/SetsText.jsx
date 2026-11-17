import { Fragment } from 'react';
import { formatSets } from '../lib/format.js';

export function SetsText({ sets }) {
  const chunks = formatSets(sets).split(' · ');
  return chunks.map((chunk, i) => (
    <Fragment key={i}>
      {i > 0 && ' '}
      <span className="nowrap">{chunk}{i < chunks.length - 1 && ' ·'}</span>
    </Fragment>
  ));
}
