# -*- coding: utf-8 -*-
"""Unit tests for email service in Rabbitai"""
import logging
import tempfile
import unittest
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from unittest import mock

from rabbitai import app
from rabbitai.utils import core as utils
from tests.base_tests import RabbitaiTestCase

from .utils import read_fixture

send_email_test = mock.Mock()
logger = logging.getLogger(__name__)


class TestEmailSmtp(RabbitaiTestCase):
    def setUp(self):
        app.config["SMTP_SSL"] = False

    @mock.patch("rabbitai.utils.core.send_mime_email")
    def test_send_smtp(self, mock_send_mime):
        attachment = tempfile.NamedTemporaryFile()
        attachment.write(b"attachment")
        attachment.seek(0)
        utils.send_email_smtp(
            "to", "subject", "content", app.config, files=[attachment.name]
        )
        assert mock_send_mime.called
        call_args = mock_send_mime.call_args[0]
        logger.debug(call_args)
        assert call_args[0] == app.config["SMTP_MAIL_FROM"]
        assert call_args[1] == ["to"]
        msg = call_args[2]
        assert msg["Subject"] == "subject"
        assert msg["From"] == app.config["SMTP_MAIL_FROM"]
        assert len(msg.get_payload()) == 2
        mimeapp = MIMEApplication("attachment")
        assert msg.get_payload()[-1].get_payload() == mimeapp.get_payload()

    @mock.patch("rabbitai.utils.core.send_mime_email")
    def test_send_smtp_data(self, mock_send_mime):
        utils.send_email_smtp(
            "to", "subject", "content", app.config, data={"1.txt": b"data"}
        )
        assert mock_send_mime.called
        call_args = mock_send_mime.call_args[0]
        logger.debug(call_args)
        assert call_args[0] == app.config["SMTP_MAIL_FROM"]
        assert call_args[1] == ["to"]
        msg = call_args[2]
        assert msg["Subject"] == "subject"
        assert msg["From"] == app.config["SMTP_MAIL_FROM"]
        assert len(msg.get_payload()) == 2
        mimeapp = MIMEApplication("data")
        assert msg.get_payload()[-1].get_payload() == mimeapp.get_payload()

    @mock.patch("rabbitai.utils.core.send_mime_email")
    def test_send_smtp_inline_images(self, mock_send_mime):
        image = read_fixture("sample.png")
        utils.send_email_smtp(
            "to", "subject", "content", app.config, images=dict(blah=image)
        )
        assert mock_send_mime.called
        call_args = mock_send_mime.call_args[0]
        logger.debug(call_args)
        assert call_args[0] == app.config["SMTP_MAIL_FROM"]
        assert call_args[1] == ["to"]
        msg = call_args[2]
        assert msg["Subject"] == "subject"
        assert msg["From"] == app.config["SMTP_MAIL_FROM"]
        assert len(msg.get_payload()) == 2
        mimeapp = MIMEImage(image)
        assert msg.get_payload()[-1].get_payload() == mimeapp.get_payload()

    @mock.patch("rabbitai.utils.core.send_mime_email")
    def test_send_bcc_smtp(self, mock_send_mime):
        attachment = tempfile.NamedTemporaryFile()
        attachment.write(b"attachment")
        attachment.seek(0)
        utils.send_email_smtp(
            "to",
            "subject",
            "content",
            app.config,
            files=[attachment.name],
            cc="cc",
            bcc="bcc",
        )
        assert mock_send_mime.called
        call_args = mock_send_mime.call_args[0]
        assert call_args[0] == app.config["SMTP_MAIL_FROM"]
        assert call_args[1] == ["to", "cc", "bcc"]
        msg = call_args[2]
        assert msg["Subject"] == "subject"
        assert msg["From"] == app.config["SMTP_MAIL_FROM"]
        assert len(msg.get_payload()) == 2
        mimeapp = MIMEApplication("attachment")
        assert msg.get_payload()[-1].get_payload() == mimeapp.get_payload()

    @mock.patch("smtplib.SMTP_SSL")
    @mock.patch("smtplib.SMTP")
    def test_send_mime(self, mock_smtp, mock_smtp_ssl):
        mock_smtp.return_value = mock.Mock()
        mock_smtp_ssl.return_value = mock.Mock()
        msg = MIMEMultipart()
        utils.send_mime_email("from", "to", msg, app.config, dryrun=False)
        mock_smtp.assert_called_with(app.config["SMTP_HOST"], app.config["SMTP_PORT"])
        assert mock_smtp.return_value.starttls.called
        mock_smtp.return_value.login.assert_called_with(
            app.config["SMTP_USER"], app.config["SMTP_PASSWORD"]
        )
        mock_smtp.return_value.sendmail.assert_called_with(
            "from", "to", msg.as_string()
        )
        assert mock_smtp.return_value.quit.called

    @mock.patch("smtplib.SMTP_SSL")
    @mock.patch("smtplib.SMTP")
    def test_send_mime_ssl(self, mock_smtp, mock_smtp_ssl):
        app.config["SMTP_SSL"] = True
        mock_smtp.return_value = mock.Mock()
        mock_smtp_ssl.return_value = mock.Mock()
        utils.send_mime_email("from", "to", MIMEMultipart(), app.config, dryrun=False)
        assert not mock_smtp.called
        mock_smtp_ssl.assert_called_with(
            app.config["SMTP_HOST"], app.config["SMTP_PORT"]
        )

    @mock.patch("smtplib.SMTP_SSL")
    @mock.patch("smtplib.SMTP")
    def test_send_mime_noauth(self, mock_smtp, mock_smtp_ssl):
        smtp_user = app.config["SMTP_USER"]
        smtp_password = app.config["SMTP_PASSWORD"]
        app.config["SMTP_USER"] = None
        app.config["SMTP_PASSWORD"] = None
        mock_smtp.return_value = mock.Mock()
        mock_smtp_ssl.return_value = mock.Mock()
        utils.send_mime_email("from", "to", MIMEMultipart(), app.config, dryrun=False)
        assert not mock_smtp_ssl.called
        mock_smtp.assert_called_with(app.config["SMTP_HOST"], app.config["SMTP_PORT"])
        assert not mock_smtp.login.called
        app.config["SMTP_USER"] = smtp_user
        app.config["SMTP_PASSWORD"] = smtp_password

    @mock.patch("smtplib.SMTP_SSL")
    @mock.patch("smtplib.SMTP")
    def test_send_mime_dryrun(self, mock_smtp, mock_smtp_ssl):
        utils.send_mime_email("from", "to", MIMEMultipart(), app.config, dryrun=True)
        assert not mock_smtp.called
        assert not mock_smtp_ssl.called


if __name__ == "__main__":
    unittest.main()
