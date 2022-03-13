const axios = require('axios');
const Config = require("./config");

let PortainerService = {
    authenticate: async () => {
        return axios.default
            .post("http://xxxxxxxxx:xxxx/api/auth",{
                "Username": Config.ROOM_NAME,
                "Password": Config.PORTAINER_PASSWORD
            });
    },
    getContainers: async () => {
        return axios.default
            .get(
                "http://xxxxxxxxx:xxxx/api/endpoints/1/docker/containers/json",
                {
                    headers: {Authorization: `Bearer ${PortainerService.token}`}
                }
            );
    },
    restartXmlRpcReceiver: () => {
        PortainerService.authenticate().then((response) => {
            PortainerService.token = response.data.jwt;
            PortainerService.getContainers().then(response => {
                let containers = response.data;
                let container  = containers.filter(
                    container => container.Image === `controller-${Config.DEDICATED_XML_PORT}`
                );

                axios.default
                    .post(
                        `http://xxxxxxxxx:xxxx/api/endpoints/1/docker/containers/${container[0].Id}/restart`,
                        {},
                        {
                            headers: {Authorization: `Bearer ${PortainerService.token}`}
                        }
                    )
                    .then(response => {
                        console.log("restarting xmlrpc container");
                    })
                    .catch(error => {
                        console.log("restart failed");
                        console.log(error);
                        process.exit();
                    })
            }).catch(error => {
                console.log("get containers failed");
                console.log(error);
                process.exit();
            })
        }).catch(error => {
            console.log("authentication failed");
            console.log(error);
            process.exit();
        })
    }
};

module.exports = PortainerService;