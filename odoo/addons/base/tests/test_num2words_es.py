from num2words import num2words

from odoo.tests.common import TransactionCase


class TestNum2WordsEs(TransactionCase):

    def test_apocope_cardinal(self):
        """In Spanish "uno" is apocopated to "un" before a masculine noun,
        which in a cardinal is mandatory before "mil" and "millones"."""
        for number, expected in [
            (1, "un"),
            (21, "veintiún"),
            (31, "treinta y un"),
            (101, "ciento un"),
            (1001, "mil un"),
            (21000, "veintiún mil"),
            (301000, "trescientos un mil"),
            (21000000, "veintiún millones"),
            (2301439, "dos millones trescientos un mil cuatrocientos treinta y nueve"),
        ]:
            with self.subTest(number=number):
                self.assertEqual(num2words(number, lang="es"), expected)

    def test_apocope_all_spanish_variants(self):
        """The apocope applies to every Spanish variant, not only "es"."""
        for lang in ("es", "es_CO", "es_VE"):
            with self.subTest(lang=lang):
                self.assertEqual(num2words(301000, lang=lang), "trescientos un mil")

    def test_unaffected_numbers(self):
        """Numbers without "uno" are left untouched."""
        for number, expected in [
            (2, "dos"),
            (11, "once"),
            (100, "cien"),
            (1100, "mil cien"),
        ]:
            with self.subTest(number=number):
                self.assertEqual(num2words(number, lang="es"), expected)

    def test_amount_to_text(self):
        """The apocope reaches the amounts printed on invoices."""
        self.env['res.lang']._activate_lang('es_MX')
        currency = self.env.ref('base.MXN').with_context(lang='es_MX')

        for amount, expected in [
            (1.00, "Un "),
            (21.00, "Veintiún "),
            (101.00, "Ciento Un "),
            (2301439.88, "Dos Millones Trescientos Un Mil Cuatrocientos Treinta Y Nueve "),
        ]:
            with self.subTest(amount=amount):
                amount_words = currency.amount_to_text(amount)
                self.assertIn(expected, amount_words)
                self.assertNotIn("Uno", amount_words)
