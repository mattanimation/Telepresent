# COTURN

these are settings that allow an easy setup for a coturn server instance.

I just created a Digital Ocean $5 droplet and spun this up.


# Before you begin
 * copy db schema run `./cp_schema.sh`
 * edit `coturn/turnserver.conf` according your db selection (mongodb)
 * create certs with `./gen-certs.sh {your-domain-name}`

# start

  `docker-compose -f docker-compose-all.yml up --build --detach`

# restart
Notice: May restart needed for coturn container, if it could not access database yet, due initialization delay.
  `docker restart docker_coturn_1`

# stop
  `docker-compose -f docker-compose-all.yml down`


# Or Stop with volume removal
  `docker-compose down --volumes`


## references
* https://www.freecodecamp.org/news/openssl-command-cheatsheet-b441be1e8c4a/
* https://www.jamescoyle.net/how-to/1073-bash-script-to-create-an-ssl-certificate-key-and-request-csr
* https://github.com/coturn/coturn
* https://community.hetzner.com/tutorials/install-turn-stun-server-on-debian-ubuntu-with-coturn
* 
