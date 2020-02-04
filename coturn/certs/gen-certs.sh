#!/bin/bash

set -euo pipefail
SCRIPTS="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#Required
domain=$1
commonname=$domain

#Change to your company details
country=US
state=Texas
locality=Austin
organization=Retrowave.tech
organizationalunit=RobotOverlord
email=mattanimation@gmail.com

#Optional
password=ihaveabellybutton

if [ -z "$domain" ]
then
    echo "Argument not present."
    echo "Useage $0 [common name]"

    exit 99
fi

echo "Generating key request for $domain"

#Generate a key
openssl genrsa -des3 -passout pass:$password -out $domain.key 2048

#Remove passphrase from the key. Comment the line out to keep the passphrase
echo "Removing passphrase from key"
openssl rsa -in $domain.key -passin pass:$password -out $domain.key

#Create the request
echo "Creating CSR"
openssl req -new -key $domain.key -out $domain.csr -passin pass:$password \
    -subj "/C=$country/ST=$state/L=$locality/O=$organization/OU=$organizationalunit/CN=$commonname/emailAddress=$email"

echo "---------------------------"
echo "-----Below is your CSR-----"
echo "---------------------------"
echo
cat $domain.crt

echo
echo "---------------------------"
echo "-----Below is your Key-----"
echo "---------------------------"
echo
cat $domain.key

echo "creating .pem files"

openssl rsa -in $domain.key -text > privkey.pem
openssl x509 -inform PEM -in $domain.crt > cert.pem

echo "task complete"