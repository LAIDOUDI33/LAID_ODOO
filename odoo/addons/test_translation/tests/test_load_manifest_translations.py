import time
from collections import defaultdict
from logging import getLogger

import polib

from odoo.tests import TransactionCase
from odoo.tools.translate import get_po_paths, get_translations_for_references

_logger = getLogger(__name__)


class TestLoadManifestTranslations(TransactionCase):
    @staticmethod
    def get_translations_for_references_polib(po_path, references):
        """Extract the relevant translations from the PO file, and return them as a dictionary.

        :param str po_path: Path to the PO file.
        :param list references: List of reference strings.
        :return dict: Dictionary mapping references to a dictionary mapping msgid to msgstr.
        """
        try:
            entries = polib.pofile(po_path)
        except OSError:
            return {}

        translations = defaultdict(dict)
        for entry in entries:
            for occ in entry.occurrences:
                occ_str = f'{occ[0]}:{occ[1]}' if occ[1] else occ[0]
                if occ_str in references and entry.msgstr and entry.msgid:
                    translations[occ_str][entry.msgid] = entry.msgstr

        return dict(translations)

    def test_load_all_modules_duration(self):
        """Load the manifest translations for all modules and compare timings with `polib` approach."""
        all_modules = self.env['ir.module.module'].search([])
        po_paths_fr = {module.name: list(get_po_paths(module.name, 'fr_FR')) for module in all_modules}
        _logger.info("Testing loading manifest translations for %d modules", len(all_modules))
        total_custom_duration = 0
        total_polib_duration = 0
        method_runners = (
            ("custom", get_translations_for_references),
            ("polib", self.get_translations_for_references_polib),
        )
        rounds = 5
        for round_idx in range(rounds):
            custom_duration = 0
            polib_duration = 0
            round_durations = {
                "custom": 0.0,
                "polib": 0.0,
            }
            ordered_runners = method_runners[round_idx % len(method_runners):] + method_runners[:round_idx % len(method_runners)]
            for module in all_modules:
                for po_path in po_paths_fr[module.name]:
                    references = [
                        f'model:ir.module.module,description:base.module_{module.name}',
                        f'model:ir.module.module,shortdesc:base.module_{module.name}',
                        f'model:ir.module.module,summary:base.module_{module.name}',
                    ]
                    for method_name, runner in ordered_runners:
                        t0 = time.perf_counter()
                        runner(po_path, references)
                        round_durations[method_name] += time.perf_counter() - t0

            custom_duration = round_durations["custom"]
            polib_duration = round_durations["polib"]

            total_custom_duration += custom_duration
            total_polib_duration += polib_duration

            _logger.info(
                "Round %d durations: custom=%.3fs, polib=%.3fs",
                round_idx + 1,
                custom_duration,
                polib_duration,
            )

        avg_custom_duration = total_custom_duration / rounds
        avg_polib_duration = total_polib_duration / rounds

        _logger.info(
            "Average durations over %d rounds: custom=%.3fs, polib=%.3fs",
            rounds,
            avg_custom_duration,
            avg_polib_duration,
        )

        self.assertLess(
            avg_custom_duration,
            avg_polib_duration,
            "The custom implementation should be faster than the polib approach.",
        )
