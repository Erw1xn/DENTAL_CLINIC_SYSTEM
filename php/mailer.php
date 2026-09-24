<?php
declare(strict_types=1);

function sendAppointmentEmail(string $recipient, string $subject, string $message): void
{
	$recipient = trim($recipient);
	if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
		throw new RuntimeException('The patient email address is invalid.');
	}

	$headers = [
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=UTF-8',
		'From: DentaNueva Dental Clinic <no-reply@dentanueva.local>',
	];

	$sent = @mail($recipient, $subject, $message, implode("\r\n", $headers));
	if (!$sent) {
		throw new RuntimeException('Email could not be sent. Configure the PHP mail settings or SMTP relay first.');
	}
}
