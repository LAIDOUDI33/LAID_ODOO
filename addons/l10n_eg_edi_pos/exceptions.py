class L10nEgEdiError(Exception):
    """Failure of an ETA e-receipt submission, carrying the record state it must produce.

    :param str message: user-facing text stored on ``l10n_eg_edi_pos_error``
    :param str state: target ``l10n_eg_edi_pos_state``, before pre-production suffixing
    :param bool clear_uuid: whether the receipt uuid must be dropped before a retry
    """

    def __init__(self, message, state='to_send', clear_uuid=False):
        self.message = message
        self.state = state
        self.clear_uuid = clear_uuid
        super().__init__(message)
